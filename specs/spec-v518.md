# roughlogic.com Specification v518 -- Battery Room Hydrogen Ventilation (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-09). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`**
> (Group A, the electrical-design bench); no new module, group, or dependency. Inherits spec.md through spec-v517.md.
>
> **The gap, and the evidence for it.** A room full of charging vented lead-acid or flooded cells liberates hydrogen,
> and once the room-average hydrogen concentration reaches the 4% lower explosive limit a spark is a bomb. IEEE 1635
> sets the exhaust rate to hold it under 1% -- a 75% margin below the LEL -- with a compact formula, `Q = 0.054 x I x N`
> in CFM, where `I` is the maximum charging current and `N` is the number of cells. The bench sizes battery banks but
> never checks the room they live in. The catch the tile exists to flag is the one that undersizes real installations:
> the formula counts **cells, not jars**. A 12 V AGM jar contains six 2 V cells, so a room of twenty-four 12 V jars is
> 144 cells, not 24, and confusing the two undersizes the exhaust six-fold. The tile takes the cell count, the maximum
> charge current, and the room volume, and returns the required exhaust airflow and the air changes per hour, so the
> room ventilation is sized off cells and current, not floor area or a generic air-change rule.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The maximum charge current
is a current (`I`); the required airflow is a volumetric flow (`L^3 T^-1`, in CFM); the room volume is `L^3`; the air
changes per hour is `T^-1`; the cell count and the `0.054` constant are `dimensionless` (the constant is unit-bearing,
carried per the empirical-relation convention). The v18/v21 contract: any non-finite input, a cell count below 1, a non-
positive charge current, or a non-positive room volume returns `{ error }`. Citation discipline (v19/v22):
`GOVERNANCE.general` over the ventilation relation by name (IEEE 1635 / IEEE-ASHRAE Guide 21; NFPA 855 hydrogen limit);
`editionNote` names the **IEEE 1635 battery-room hydrogen ventilation rate**, prints `Q_cfm = 0.054 x I x N` and
`ACH = Q x 60 / room_volume`, and states that **the formula counts individual cells not jars or modules (a 12 V jar is
six 2 V cells, and confusing them undersizes the exhaust several-fold), the rate holds the room-average hydrogen below
1% by volume (a 75% margin under the 4% LEL), local spots near cells can exceed the average so diffusion and inlet
placement matter, sealed VRLA in normal float produces far less gas than this bounding case, and the applicable code and
the room design govern** -- a design aid, not the fire and building code.

## 2. The tile

### 2.1 `battery-hydrogen-vent` -- The Cells-Not-Jars Exhaust Rate That Keeps a Battery Room Under the LEL

```
inputs:
  cell_count         -     number of individual 2 V cells (NOT jars/modules)
  charge_current_a   A     maximum charging current per string
  room_volume_ft3    ft3   battery room volume (for air changes)

Q_cfm = 0.054 x charge_current_a x cell_count             [cfm]
ACH   = Q_cfm x 60 / room_volume_ft3                      [air changes / hr]
```

**Pinned worked example (a 24-cell string charging at 20 A, in an 800 ft^3 room).**
`Q = 0.054 x 20 x 24 = ` **25.9 cfm** of continuous exhaust, which in an 800 ft^3 room is
`25.9 x 60 / 800 = ` **1.9 air changes per hour**. **Cross-check (counting jars instead of cells undersizes it
six-fold).** The same room built from twenty-four 12 V jars is really `24 x 6 = ` **144 cells**, so the true rate is
`0.054 x 20 x 144 = ` **155.5 cfm** -- six times the airflow, and the room ventilated for "24" would sit dangerously
under-exhausted. The tile returns the required exhaust airflow and the air changes per hour, computed from cells.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`); a `tile-meta.js` `_TILES` entry; a `citations.js` entry
(`GOVERNANCE.general`, `editionNote` per §1); `test/fixtures/worked-examples.json` (the 24-cell example + the
jars-vs-cells cross-check); `test/fixtures/compute-map.js` (`battery-hydrogen-vent` -> `computeBatteryHydrogenVent` in
`../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `standby-battery-sizing` / `off-grid-battery` /
`battery-runtime`); `data/search/aliases.json` ("battery room ventilation", "hydrogen ventilation", "ieee 1635",
"battery hydrogen cfm", "cells not jars", "battery room exhaust", "h2 ventilation", "vrla ventilation"); the id appended
to the electrical renderers declare in `app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a
`bounds-fuzzer.test.js` block pinning both examples, the linear scaling with cells and current, the ACH-from-volume
relation, and the error seams (non-finite, cell count < 1, non-positive current / volume). Hand-writes its renderer
(mirroring the calc-electrical.js `standby-battery-sizing` pattern). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all 28 gates, `check-readme-counts` re-pinned **+1 tile**); `npm test` (+2 fixtures,
the new fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples
runner; 320 px audit (the CFM / ACH stack wraps on a phone); render-no-nan + a11y on the new tile, output read to the
value (the 24-cell example -> 25.9 cfm).

## 5. Roadmap position

Adds the room-safety check beside `standby-battery-sizing` and `off-grid-battery` (which size the bank itself). A
per-technology gassing-rate set (flooded vs VRLA float vs equalize) and a hydrogen-detector-setpoint companion are
deliberate future follow-ons. Further Group A growth stays evidence-driven.
