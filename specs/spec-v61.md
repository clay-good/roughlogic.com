# roughlogic.com Specification v61 -- Water-Supply Demand and Pressure Budget (2 New Tiles)

> **Implementation status: OPEN (proposed 2026-06-13; targets package 0.55.0, a
> minor; catalog 590 -> 592, Group B 42 -> 44).** v61 inherits everything from
> spec.md through spec-v60.md and changes none of it. It assumes the v58-v60
> restoration batch has landed (catalog base 590) and is independent of it; v61
> deepens **Group B (Plumbing and Gas)**.
>
> v61 adds the two tiles at the *head* of every domestic water-supply design: the
> **probable peak demand** a building actually draws (Hunter's-curve conversion of
> water-supply fixture units to GPM), and the **pressure budget** that decides
> whether the street can push that demand to the worst-case fixture. Group B
> already sizes a pipe (`pipe-sizing`), a meter (`water-meter-sizing`), and a
> single friction segment (`friction-loss`, `static-pressure-piping`), but it had
> no tile that turns a fixture list into the design GPM, and none that sums every
> loss between the main and the critical fixture into a go / no-go residual. **No
> new group, no new dependencies, no telemetry, no AI, US standards only.** Both
> land in `calc-plumbing.js`.
>
> **The gap, and the evidence for it.** A concept-check for
> wsfu / water-supply-fixture-unit / hunter-curve / probable-demand /
> pressure-budget / available-pressure / minimum-residual returned nothing.
> `pipe-sizing` rolls fixture units into a pipe diameter but exposes no standalone
> WSFU -> GPM probable-demand number (the figure every downstream sizing decision
> starts from); `static-pressure-piping` reports the elevation/static loss of one
> run, and `friction-loss` one segment, but neither composes street pressure,
> elevation, meter, backflow, and developed-length loss into a residual at the
> fixture against a required minimum.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `wsfu-demand` inputs are dimensionless fixture-unit
  counts producing a volumetric flow (`L^3/T`, GPM) by interpolation;
  `supply-pressure-budget` carries pressures (`F/L^2`, psi) and a length (`L`,
  elevation ft) converted to pressure by the 0.433 psi/ft water constant.
- The v18/v21 tile contract applies. `wsfu-demand`: a non-finite or negative
  fixture-unit total, or a breakpoint table that is not strictly increasing,
  returns `{ error }`; the GPM is a bounded finite interpolation. `supply-pressure-
  budget`: any non-finite input, a non-positive street pressure, or a negative
  elevation returns `{ error }`; the residual may be negative (that is the
  "short" verdict), but it is always finite.
- The v19/v22 citation discipline applies. Both use `GOVERNANCE.general`.
  `wsfu-demand` names **Hunter's curve (NBS BMS65, "Methods of Estimating Loads
  in Plumbing Systems")** and **IPC 2021 Appendix E (Table E103.3(2))** by name;
  `supply-pressure-budget` names **IPC 2021 Section 604** and the **ASPE Plumbing
  Engineering Design Handbook Vol. 2**. Standard text and tables are not
  reproduced; the demand curve ships as editable breakpoints, not a transcribed
  table.
- Tile ids are kebab-case and checked against the live ids: `wsfu-demand` and
  `supply-pressure-budget` do not collide and are not concept-duplicates (Section 3).

## 2. The tiles

### 2.1 `wsfu-demand` -- Probable Peak Demand from Fixture Units (Group B, calc-plumbing.js)

Hunter's curve maps the total water-supply fixture units (WSFU) on a system to the
probable simultaneous peak flow in GPM. The curve is empirical and non-linear, and
it splits in two: a **flush-tank** (gravity tank) system and a **flush-valve**
(flushometer) system draw different peaks for the same WSFU. This tile interpolates
the published curve for the selected system type and returns the design GPM.

```
inputs:
  wsfu          dimensionless  total water-supply fixture units on the system
  system_type   choice         flush_tank | flush_valve (default flush_tank)
  curve         table          editable [wsfu, gpm] breakpoints for the selected curve

gpm = interpolate(curve, wsfu)        piecewise-linear between published points
```

Outputs: the probable peak demand (GPM), the two bracketing breakpoints used, and
the selected curve. The note line states: the WSFU values come from the fixture
schedule (IPC Table E103.3(2) assigns WSFU per fixture by supply type, hot/cold/
total); flush-valve systems peak higher at low WSFU and must use that curve; and
the result is the *design* demand that feeds `pipe-sizing`, `water-meter-sizing`,
and `supply-pressure-budget`, not a metered actual.

**Worked example (pinned).** A small office totals 120 WSFU on a flush-valve
system. With the published flush-valve curve bracketing 120 WSFU between
(100 WSFU, 55 GPM) and (150 WSFU, 66 GPM), interpolation gives
55 + (120-100)/(150-100) x (66-55) = 55 + 0.4 x 11 = **59.4 GPM**. Cross-check
(flush-tank curve, same 120 WSFU between (100, 43) and (150, 51)):
43 + 0.4 x 8 = **46.2 GPM** -- the gravity-tank system draws less for identical
fixture count. Degenerate inputs (WSFU < 0, non-finite, or a non-monotonic curve)
return an error.

### 2.2 `supply-pressure-budget` -- Available Pressure at the Critical Fixture (Group B, calc-plumbing.js)

Every loss between the water main and the worst-case fixture is subtracted from the
street pressure; what is left is the residual the fixture sees. This tile composes
the elevation lift, the meter loss, any backflow/treatment loss, and the developed-
length friction loss, and compares the residual to the fixture's required minimum.

```
inputs:
  street_pressure   psi   minimum available main pressure (use the low, not the peak)
  fixture_height    L     elevation of the critical fixture above the main (ft)
  meter_loss        psi   loss across the water meter at design flow
  bfp_loss          psi   loss across backflow preventer / softener / filter (default 0)
  friction_loss     psi   developed-length pipe + fitting friction at design flow
  fixture_min       psi   required flowing residual at the fixture (default 8; 15-25 flush valve)

elevation_loss = fixture_height x 0.433       0.433 psi per foot of water column
available      = street_pressure - elevation_loss - meter_loss - bfp_loss - friction_loss
headroom       = available - fixture_min
adequate       = headroom >= 0
```

Outputs: the elevation loss, the available flowing residual at the fixture, the
headroom above the required minimum, and the adequate / short verdict. The note line
states: use the *minimum* recorded street pressure (a residual sized at peak-day low
pressure protects the worst case); flush-valve and tankless fixtures carry a higher
minimum (15-25 psi) than a standard tank fixture (8 psi); and IPC 604 caps static
pressure at 80 psi, requiring a PRV above it (which adds its own downstream loss).

**Worked example (pinned).** Street 60 psi; critical fixture 30 ft up; meter loss
8 psi; no backflow/softener (0); developed-length friction 12 psi; standard fixture
minimum 8 psi. Elevation loss = 30 x 0.433 = **13.0 psi**; available = 60 - 13.0 -
8 - 0 - 12 = **27.0 psi**; headroom = 27.0 - 8 = **19.0 psi**, verdict **adequate**.
Cross-check (same system feeding a flushometer, fixture_min 25): headroom = 27.0 -
25 = **2.0 psi**, still adequate but with almost no margin -- a higher floor or one
added fitting flips it short. Degenerate inputs (street_pressure <= 0, negative
height, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the live catalog. `pipe-sizing` consumes fixture units to
emit a diameter but never surfaces the probable-demand GPM as a standalone figure;
`wsfu-demand` is that figure, and it is an input to pipe, meter, and pressure
sizing. `static-pressure-piping` reports the static (elevation) loss of one run and
`friction-loss` one segment's loss; `supply-pressure-budget` is the *system*
residual that sums elevation + meter + backflow + friction against a fixture
minimum and returns a go / no-go -- a different output (a verdict, not a single
loss). `water-meter-sizing` checks a candidate meter against a peak demand; this
tile produces that demand and the pressure context the meter sits in. **Both ship**,
into `calc-plumbing.js`.

Per-tile wiring (each tile): a `tools-data.js` row (group `B`, trades
`["plumbing"]`); `tile-meta.js` `_TILES`; a `citations.js` entry (`wsfu-demand`:
Hunter's curve / NBS BMS65 and IPC 2021 Appendix E by name, `GOVERNANCE.general`,
assumptions listing the default flush-tank curve and that WSFU come from the fixture
schedule; `supply-pressure-budget`: IPC 2021 Section 604 and ASPE PEDH Vol. 2 by
name, `GOVERNANCE.general`, assumptions listing the 0.433 psi/ft constant and the
default 8 psi fixture minimum); `test/fixtures/worked-examples.json` (the 120 WSFU
flush-valve case and the 60 psi budget, plus the flush-tank and flush-valve cross-
checks); `test/fixtures/compute-map.js` (module path `../../calc-plumbing.js`);
`scripts/related-tiles.mjs` (`wsfu-demand` -> `pipe-sizing` / `water-meter-sizing` /
`supply-pressure-budget`; `supply-pressure-budget` -> `friction-loss` /
`static-pressure-piping` / `wsfu-demand`); `data/search/aliases.json`
(`wsfu-demand`: "fixture units", "hunter curve", "water supply fixture unit",
"probable demand", "peak gpm", "wsfu"; `supply-pressure-budget`: "available
pressure", "pressure budget", "residual pressure", "pressure loss", "minimum
pressure", "psi at fixture"); the `// dims:` annotations; and the regenerated v14
corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins both worked
examples, the flush-tank and flush-valve cross-checks, and every error seam
(non-monotonic curve, non-finite WSFU, non-positive street pressure, negative
height).

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; `check-readme-counts` must agree
at **592 tiles** and the matching sitemap URL count); `npm test` (+2 tests);
`npm run build` (592 tile shells + sitemap); `npm run data:verify`; the worked-
examples runner (+2 fixtures); the 320 px shell audit (the demand GPM, the bracket
points, and the four-line pressure breakdown plus verdict must wrap, not scroll, on
a phone); and the full-catalog render-no-nan Chromium sweep plus the a11y gate, with
the rendered output read to the value (120 WSFU flush-valve -> 59.4 GPM;
60 psi / 30 ft / 8 / 12 / min 8 -> 27.0 psi available, 19.0 psi headroom, adequate).

## 5. Roadmap position

v61 brings Group B to 44 tiles and gives the suite the front of the water-supply
design chain it was missing: fixture list -> WSFU -> probable GPM (`wsfu-demand`)
-> pipe diameter (`pipe-sizing`) and meter (`water-meter-sizing`), with
`supply-pressure-budget` closing the loop by proving the street can deliver that
demand to the worst fixture. It opens the v61-v64 plumbing expansion (v61 supply
demand and pressure, v62 storm and sump take-offs, v63 gas demand and relief, v64
install reference and treatment). Further Group B growth should stay evidence-driven
(a named gap a working plumber hits), not catalog-filling.
