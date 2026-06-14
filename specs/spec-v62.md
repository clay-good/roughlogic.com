# roughlogic.com Specification v62 -- Roof Drainage and Sump/Ejector Sizing (2 New Tiles)

> **Implementation status: CLOSED 2026-06-13 (package stamped 0.56.0, a minor;
> catalog 592 -> 594, Group B 44 -> 46; corpus 898, dims 901, fuzzer 898/898,
> derivation 594/594).** v62 inherits everything from
> spec.md through spec-v61.md and changes none of it. It assumes v61 has landed
> (catalog base 592) and deepens **Group B (Plumbing and Gas)**.
>
> v62 adds the two storm-and-below-grade take-offs the suite lacked: **roof-drain
> and leader sizing** (turn a roof area and a design rainfall into the storm GPM
> and the drain/leader size) and **sump/sewage-ejector basin and pump-cycle
> sizing** (does the basin draw down enough volume per cycle, and does the pump
> short-cycle against the inflow). Group B sizes site runoff (`stormwater-rational`)
> and a generic pump (`pump-sizing`, `pump-tdh`), but it had no tile for the
> *plumbing* storm path (roof to leader to horizontal storm drain) and none for the
> basin-and-cycle math that decides whether an ejector or sump pump is sized right.
> **No new group, no new dependencies, no telemetry, no AI, US standards only.**
> Both land in `calc-plumbing.js`.
>
> **The gap, and the evidence for it.** A concept-check for
> roof-drain / leader / storm-leader / sump / sewage-ejector / lift-station /
> basin-drawdown / pump-cycle returned nothing in Group B. `stormwater-rational`
> returns site peak runoff in cfs from C x i x A (a civil/grading number), not the
> roof-area-to-leader-size plumbing path; `pump-sizing` and `pump-tdh` size head and
> flow but never compute basin drawdown volume or cycle time against an inflow rate.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

- The v14 dimensional-analysis lint, bounds-fuzzer, worked-example registry, and
  reviewer-signoff apply. `roof-drain-sizing` carries an area (`L^2`, ft^2) and a
  rainfall rate (`L/T`, in/hr) producing a volumetric flow (`L^3/T`, GPM) via the
  0.0104 GPM-per-(ft^2 x in/hr) constant, plus a size by interpolation against an
  editable capacity table. `sump-basin-sizing` carries a diameter and a depth (`L`)
  producing a drawdown volume (`L^3`, gal) and times (`T`, minutes) from volume over
  flow.
- The v18/v21 tile contract applies. `roof-drain-sizing`: a non-positive area or
  rainfall, a non-finite input, or a non-monotonic capacity table returns
  `{ error }`. `sump-basin-sizing`: a non-positive basin dimension, a non-positive
  pump rate, a non-finite input, or **inflow >= pump rate** (the pump cannot empty
  the basin) returns `{ error }`; all times are finite and positive.
- The v19/v22 citation discipline applies. Both use `GOVERNANCE.general`.
  `roof-drain-sizing` names **IPC 2021 Section 1106 (Tables 1106.2, 1106.3,
  1106.6)** by name; `sump-basin-sizing` names **IPC 2021 Section 712 (Sumps and
  Ejectors)** and the **Hydraulic Institute** pump-cycling guidance. Standard
  tables are not reproduced; pipe capacities ship as editable breakpoints.
- Tile ids are kebab-case and checked against the live ids: `roof-drain-sizing` and
  `sump-basin-sizing` do not collide and are not concept-duplicates (Section 3).

## 2. The tiles

### 2.1 `roof-drain-sizing` -- Roof Area to Storm GPM and Leader Size (Group B, calc-plumbing.js)

A roof drain must carry the peak rain falling on the area it serves. The storm flow
is the horizontally projected roof area times the design rainfall rate times a unit
constant; the leader and horizontal storm drain are then sized to carry it. This
tile returns the GPM and the size from an editable capacity table.

```
inputs:
  roof_area      L^2    horizontally projected area served by the drain (ft^2)
  rainfall_rate  L/T    design rainfall, 1-hr / 100-yr from the IPC map (in/hr)
  drain_slope    choice horizontal storm drain slope: 1/8 | 1/4 | 1/2 in per ft
  capacity       table  editable [pipe_size, gpm] breakpoints for vertical leader and the slope

gpm        = roof_area x rainfall_rate x 0.0104     1 in/hr over 1 ft^2 = 0.0104 GPM
leader_in  = smallest pipe in the vertical-leader table with capacity >= gpm
horiz_in   = smallest pipe in the slope table with capacity >= gpm
```

Outputs: the storm flow (GPM), the required vertical leader size, and the required
horizontal storm-drain size at the chosen slope. The note line states: rainfall rate
comes from the IPC Figure 1106.1 100-year/1-hour map for the locale (not a national
default); sloped, vertical, and parapet walls add their contributing area per IPC
1106.4; and overflow drains/scuppers (IPC 1107) are a separate required path the
tile does not size.

**Worked example (pinned).** 5,000 ft^2 roof, 4 in/hr design rainfall:
gpm = 5,000 x 4 x 0.0104 = **208 GPM**. Against the bundled capacity table, that
selects a **6 in** vertical leader (4 in tops out below 208 GPM) and, at 1/4 in/ft,
an **8 in** horizontal storm drain. Cross-check (Miami-class 6 in/hr rainfall, same
roof): gpm = 5,000 x 6 x 0.0104 = **312 GPM**, pushing both sizes up one increment.
Degenerate inputs (area <= 0, rainfall <= 0, non-finite, non-monotonic table) return
an error.

### 2.2 `sump-basin-sizing` -- Basin Drawdown and Pump-Cycle Check (Group B, calc-plumbing.js)

A sump or sewage-ejector basin works in cycles: the pump runs to empty the drawdown
band, then the basin refills from the inflow until the pump restarts. If the
drawdown volume is too small for the inflow and pump, the motor short-cycles and
burns out. This tile returns the drawdown volume, the run and fill times, the cycles
per hour, and a short-cycle verdict.

```
inputs:
  basin_dia     L    inside diameter of the basin (in)
  drawdown_in   L    vertical distance between pump-off and pump-on floats (in)
  inflow_gpm    L^3/T design inflow to the basin (GPM)
  pump_gpm      L^3/T pump discharge rate at the system head (GPM)
  min_run_s     T    minimum acceptable run time per cycle (default 60 s)

area_ft2      = PI/4 x (basin_dia/12)^2
drawdown_gal  = area_ft2 x (drawdown_in/12) x 7.48
run_time_s    = drawdown_gal / (pump_gpm - inflow_gpm) x 60    pump empties the band
fill_time_s   = drawdown_gal / inflow_gpm x 60                 basin refills
cycles_per_hr = 3600 / (run_time_s + fill_time_s)
ok            = run_time_s >= min_run_s
```

Outputs: the drawdown volume (gal), the run and fill times (s), the cycles per hour,
and the adequate / short-cycling verdict. The note line states: the pump must out-
pace the inflow (the tile errors if it does not -- that is an undersized pump or an
overwhelmed basin); a longer run time per cycle is gentler on the motor (raise the
float spread or basin size to lengthen it); and a sewage ejector must pass 2 in
solids and carries a vent, neither of which this tile sizes (IPC 712.3-712.4).

**Worked example (pinned).** 24 in basin, 12 in float spread, 10 GPM inflow, 30 GPM
pump, 60 s minimum run. area = PI/4 x (24/12)^2 = 3.14 ft^2; drawdown = 3.14 x 1 x
7.48 = **23.5 gal**; run = 23.5/(30-10) x 60 = **70.5 s** (>= 60, good); fill = 23.5/
10 x 60 = **141 s**; cycle = 70.5 + 141 = 211.5 s -> **17.0 cycles/hr**; verdict
**adequate**. Cross-check (same basin, 18 in pump-off-to-on band kept but inflow
raised to 25 GPM): run = 23.5/5 x 60 = 282 s, fill = 56 s, ~10.6 cycles/hr -- still
adequate, slower-cycling. Degenerate inputs (any dimension <= 0, pump <= 0,
**inflow >= pump**, non-finite) return an error.

## 3. Concept-check and wiring

Concept-checked against the live catalog. `stormwater-rational` returns site peak
runoff (cfs/gpm) from C x i x A for grading and detention -- a civil number;
`roof-drain-sizing` is the building plumbing path (roof area -> leader and storm-
drain size per IPC 1106), a different method and output. `pump-sizing` and
`pump-tdh` solve head and flow for a pump curve; `sump-basin-sizing` solves the
basin geometry and the start/stop cycle against an inflow -- neither existing tile
computes drawdown volume or cycle time. **Both ship**, into `calc-plumbing.js`.

Per-tile wiring (each tile): a `tools-data.js` row (group `B`, trades
`["plumbing"]`); `tile-meta.js` `_TILES`; a `citations.js` entry
(`roof-drain-sizing`: IPC 2021 Section 1106 by name, `GOVERNANCE.general`,
assumptions listing the 0.0104 constant and that rainfall is locale-specific from
Figure 1106.1; `sump-basin-sizing`: IPC 2021 Section 712 and the Hydraulic Institute
cycling guidance by name, `GOVERNANCE.general`, assumptions listing the 7.48 gal/ft^3
constant and the 60 s default minimum run); `test/fixtures/worked-examples.json`
(the 5,000 ft^2 / 4 in/hr roof and the 24 in / 30 GPM basin, plus the 6 in/hr and
25 GPM cross-checks); `test/fixtures/compute-map.js` (module path
`../../calc-plumbing.js`); `scripts/related-tiles.mjs` (`roof-drain-sizing` ->
`stormwater-rational` / `rainwater-yield` / `slope`; `sump-basin-sizing` ->
`pump-sizing` / `pump-tdh` / `sanitary-dfu`); `data/search/aliases.json`
(`roof-drain-sizing`: "roof drain", "leader", "storm drain", "rainfall", "roof
leader", "scupper"; `sump-basin-sizing`: "sump pump", "sewage ejector", "lift
station", "basin", "pump cycle", "short cycle"); the `// dims:` annotations; and the
regenerated v14 corpus + tile-index. A `test/unit/bounds-fuzzer.test.js` block pins
both worked examples, the high-rainfall and high-inflow cross-checks, and every
error seam (non-positive area/rainfall, non-monotonic capacity table, non-positive
basin dimension, inflow >= pump).

## 4. As-landed verification (gate plan to satisfy)

The standard green bar: `npm run lint` (every gate; `check-readme-counts` must agree
at **594 tiles** and the matching sitemap URL count); `npm test` (+2 tests);
`npm run build` (594 tile shells + sitemap); `npm run data:verify`; the worked-
examples runner (+2 fixtures); the 320 px shell audit (the GPM and two sizes for the
roof drain, and the drawdown/run/fill/cycle block plus verdict for the sump, must
wrap, not scroll, on a phone); and the full-catalog render-no-nan Chromium sweep
plus the a11y gate, with the rendered output read to the value (5,000 ft^2 / 4 in/hr
-> 208 GPM, 6 in leader, 8 in horizontal; 24 in / 12 in / 10 / 30 -> 23.5 gal,
70.5 s run, 17.0 cycles/hr, adequate).

## 5. Roadmap position

v62 brings Group B to 46 tiles and completes the storm-and-below-grade path: a roof
now sizes its own drains and leaders (`roof-drain-sizing`) and a basin proves it
will not short-cycle (`sump-basin-sizing`), filling the space between the site
runoff (`stormwater-rational`) and the sanitary drain (`sanitary-dfu`). It is the
second of the v61-v64 plumbing expansion. Further Group B growth should stay
evidence-driven (a named gap a working plumber hits), not catalog-filling.
