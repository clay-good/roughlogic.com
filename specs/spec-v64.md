# roughlogic.com Specification v64 -- Pipe Support Spacing and Softener Sizing (2 New Tiles)

> **Implementation status: CLOSED 2026-06-13 (package stamped 0.58.0, a minor;
> catalog 596 -> 598, Group B 48 -> 50; corpus 902, dims 905, fuzzer 902/902,
> derivation 598/598).** v64 inherits everything from
> spec.md through spec-v63.md and changes none of it. It assumes v63 has landed
> (catalog base 596) and deepens **Group B (Plumbing and Gas)**, completing the
> v61-v64 plumbing expansion.
>
> v64 adds the two everyday-reference tiles a plumber pulls out on the job: the
> **pipe support/hanger spacing** for a material and size (and the hanger count for
> a run) and **water-softener sizing** (daily hardness load, days between
> regenerations, and salt use). Group B has install-geometry tiles (`rolling-offset`,
> `pipe-fitting-takeout`, `pipe-spacing-rack`) and water tiles across the suite, but
> it had no longitudinal hanger-spacing reference and no softener sizing at all --
> the most common residential water-treatment question. **No new group, no new
> dependencies, no telemetry, no AI, US standards only.** Both land in
> `calc-plumbing.js`.
>
> **The gap, and the evidence for it.** A concept-check for
> hanger / support-spacing / strut / softener / brine / regeneration / grains-
> capacity returned nothing. `pipe-spacing-rack` sets the *lateral* gap between
> parallel insulated lines on a rack (a thermal/clearance number), not the
> *longitudinal* support interval along one run; no tile sizes a water softener's
> grain load, regeneration interval, or salt dose.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `pipe-support-spacing` carries a run length and a max
  spacing (`L`, ft) producing a dimensionless hanger count by `ceil`.
  `softener-sizing` carries a daily volume (`L^3`, gal/day) times a hardness
  concentration (grains/gal) producing a daily grain load (grains/day), divided into
  a resin grain capacity for a dimensionless day count.
- The v18/v21 tile contract applies. `pipe-support-spacing`: a non-positive run, a
  non-positive spacing, or a non-finite input returns `{ error }`; the hanger count
  is `ceil(run / spacing) + 1`, bounded. `softener-sizing`: a non-positive
  occupancy/usage, a non-positive capacity, a negative hardness/iron, or a non-finite
  input returns `{ error }`; the day count is `floor` of a finite ratio.
- The v19/v22 citation discipline applies. Both use `GOVERNANCE.general`.
  `pipe-support-spacing` names **IPC 2021 Table 308.5** and **MSS SP-58** by name,
  shipping the spacing table as editable breakpoints by material and size;
  `softener-sizing` names **NSF/ANSI 44** and the **Water Quality Association (WQA)**
  hardness/iron-compensation practice by name. Standard tables are not reproduced.
- Tile ids are kebab-case and checked against the live ids: `pipe-support-spacing`
  and `softener-sizing` do not collide and are not concept-duplicates (Section 3).

## 2. The tiles

### 2.1 `pipe-support-spacing` -- Hanger Spacing and Count for a Run (Group B, calc-plumbing.js)

Horizontal and vertical piping must be supported at intervals set by the pipe
material and size. This tile returns the maximum spacing for the selected material
and size from the IPC 308.5 table, and the number of hangers a given run needs.

```
inputs:
  material      choice  copper | steel | cpvc | pvc | pex | cast_iron
  pipe_size     L       nominal pipe size (in)
  run_length    L       horizontal run to support (ft)
  orientation   choice  horizontal | vertical
  table         data    editable [material, size, horiz_ft, vert_ft] from IPC 308.5

max_spacing  = lookup(table, material, pipe_size, orientation)
hangers      = ceil(run_length / max_spacing) + 1     both ends plus interior supports
```

Outputs: the maximum support spacing (ft) for the material/size/orientation, and the
hanger count for the run. The note line states: plastic pipe (PVC/CPVC) supports
closer than metal and needs continuous support or mid-story guides on vertical runs;
the values are *maximums* (closer is always allowed, and required near valves, heavy
fittings, and changes of direction); and vertical piping is also supported at each
floor/story regardless of the interval (IPC 308.5).

**Worked example (pinned).** 1 in type-L copper, horizontal, 24 ft run. IPC 308.5
gives a 6 ft maximum horizontal spacing for copper: hangers = ceil(24/6) + 1 =
4 + 1 = **5**. Cross-check (1/2 in PEX, horizontal, same 24 ft, 32 in = 2.67 ft
maximum): hangers = ceil(24/2.67) + 1 = 9 + 1 = **10** -- the same run needs twice
the hangers because PEX supports closer. Degenerate inputs (run <= 0, spacing <= 0,
non-finite) return an error.

### 2.2 `softener-sizing` -- Grain Load, Regeneration Interval, and Salt (Group B, calc-plumbing.js)

A water softener is sized so it does not exhaust its resin between regenerations. The
daily grain load is the household water use times the compensated hardness; dividing
the resin capacity by that load gives the days between regenerations, and the salt
dose follows from the capacity. This tile returns all three.

```
inputs:
  people        count   occupants
  use_per_cap   L^3     water use per person per day (gal/day; default 75)
  hardness_gpg  grains/gal  total hardness (grains per gallon; 1 gpg = 17.1 ppm)
  iron_ppm      ppm     dissolved iron (compensated at ~4 gpg per ppm; default 0)
  capacity      grains  usable resin capacity at the chosen salt dose
  salt_per_regen L      salt charged per regeneration (lb; default from capacity)

comp_hardness = hardness_gpg + iron_ppm x 4         WQA iron compensation
daily_gal     = people x use_per_cap
grain_load    = daily_gal x comp_hardness           grains per day
days_between  = floor(capacity / grain_load)
annual_salt   = salt_per_regen x (365 / days_between)
```

Outputs: the compensated hardness (gpg), the daily grain load (grains/day), the days
between regenerations, and the salt per regeneration and per year. The note line
states: dissolved iron, manganese, and high TDS each raise the effective load and may
exceed a softener's rating (pre-treatment may be required); a higher salt dose buys
more capacity per cubic foot but at lower salt efficiency; and the capacity used must
match the dose the control valve is programmed for (NSF/ANSI 44).

**Worked example (pinned).** 4 people at 75 gal/day; 20 gpg hardness; 2 ppm iron;
32,000-grain usable capacity; 15 lb salt per regen. comp_hardness = 20 + 2 x 4 =
**28 gpg**; daily_gal = 4 x 75 = 300; grain_load = 300 x 28 = **8,400 grains/day**;
days_between = floor(32,000 / 8,400) = **3 days**; annual salt = 15 x (365/3) =
**1,825 lb/yr**. Cross-check (no iron, soft-ish 12 gpg, same house/capacity):
load = 300 x 12 = 3,600; days_between = floor(32,000/3,600) = **8 days**, far less
salt. Degenerate inputs (people <= 0, use <= 0, capacity <= 0, negative
hardness/iron, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the live catalog. `pipe-spacing-rack` (calc-pipefit.js) sets
the lateral clearance between parallel insulated lines on a rack -- a thermal/
clearance gap, not the support interval along a single run; `pipe-support-spacing` is
the longitudinal hanger spacing and count per IPC 308.5, a different quantity and
table. No tile sizes a water softener; the suite's water-treatment tiles
(`langelier-index`, `dilution`, pool chemistry) address scaling and dosing, not
ion-exchange grain capacity or regeneration interval. **Both ship**, into
`calc-plumbing.js`.

Per-tile wiring (each tile): a `tools-data.js` row (group `B`, trades
`["plumbing"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(`pipe-support-spacing`: IPC 2021 Table 308.5 and MSS SP-58 by name,
`GOVERNANCE.general`, assumptions listing the `ceil(run/spacing)+1` count and that
values are maximums; `softener-sizing`: NSF/ANSI 44 and WQA by name,
`GOVERNANCE.general`, assumptions listing the 75 gal/day default, the 4 gpg-per-ppm
iron compensation, and the 17.1 ppm/gpg conversion); `test/fixtures/worked-
examples.json` (the 1 in copper / 24 ft run and the 4-person / 28 gpg softener, plus
the PEX and soft-water cross-checks); `test/fixtures/compute-map.js` (module path
`../../calc-plumbing.js`); `scripts/related-tiles.mjs` (`pipe-support-spacing` ->
`pipe-spacing-rack` / `pipe-expansion` / `rolling-offset`; `softener-sizing` ->
`langelier-index` / `dilution` / `pressure-tank-drawdown`); `data/search/aliases.json`
(`pipe-support-spacing`: "hanger spacing", "pipe support", "strut", "hanger count",
"support interval", "clevis"; `softener-sizing`: "water softener", "brine",
"regeneration", "grains", "salt", "hard water"); the `// dims:` annotations; and the
regenerated v14 corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins
both worked examples, the PEX and soft-water cross-checks, and every error seam
(non-positive run/spacing, non-positive occupancy/usage/capacity, negative
hardness/iron).

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; `check-readme-counts` must agree
at **598 tiles** and the matching sitemap URL count); `npm test` (+2 tests);
`npm run build` (598 tile shells + sitemap); `npm run data:verify`; the worked-
examples runner (+2 fixtures); the 320 px shell audit (the spacing and hanger count,
and the four-line softener block, must wrap, not scroll, on a phone); and the full-
catalog render-no-nan Chromium sweep plus the a11y gate, with the rendered output
read to the value (1 in copper / 24 ft -> 6 ft max, 5 hangers; 4 people / 20 gpg /
2 ppm iron / 32,000 grains -> 28 gpg, 8,400 grains/day, 3 days, 1,825 lb/yr).

## 5. Roadmap position

v64 brings Group B to 50 tiles and closes the v61-v64 plumbing expansion: the suite
now runs a residential water-supply job end to end -- fixture demand and pressure
budget (v61), storm and sump take-offs (v62), gas demand and relief safety (v63),
and the install-and-treatment references a plumber reaches for daily (v64). With this
batch Group B is broad and well-rounded; remaining candidates a future spec could
weigh on evidence include radiant-loop length/GPM, pipe-freeze time and heat-trace
wattage, and water-heater peak-hour storage sizing -- each pursued only when a working
plumber names the gap, not to fill the catalog.
