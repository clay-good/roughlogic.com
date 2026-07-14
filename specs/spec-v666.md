# roughlogic.com Specification v666 -- Battery Room Max Charge Current from Available Airflow (calc-electrical.js, Group A, 1 New Tile)

> **Status: PROPOSED (2026-07-13). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-electrical.js`** (Group A,
> electrical), no new module, group, or dependency. Inherits spec.md through spec-v665.md.
>
> **The gap, and the evidence for it.** Spec-v518 (`battery-hydrogen-vent`) runs IEEE 1635 forward: given the cell count
> and the maximum charge current, it returns the exhaust `Q = 0.054 x I x N` cfm that holds the room-average hydrogen
> below 1%. The other real-world case is the reverse: the exhaust fan is already installed and moves a known airflow, and
> the question is **how much charge current the room can safely support**, `I_max = Q / (0.054 x N)`. The forward tile
> never returns it; you would have to guess currents and re-run the ventilation until it matched the fan. And it carries
> the same cells-not-jars trap: `N` counts individual 2 V cells, so a room of twenty-four 12 V jars is 144 cells, not 24.
> The number this settles: a **100 cfm** exhaust over a **24-cell** string supports **77 A**; counted as 144 cells it is
> only **12.9 A** -- mistaking jars for cells overstates the safe current six-fold, the same factor the forward tile warns
> undersizes the fan.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the
`battery-hydrogen-vent` sibling: the available airflow is `L^3 T^-1` (cfm), the cell count is `dimensionless`, and the
returned current is `I` (A). The `0.054` IEEE 1635 constant is the sibling's. The v18/v21 contract: any non-finite
input, or a non-positive airflow, or a cell count below 1, returns `{ error }`. Citation discipline (v19/v22): IEEE 1635
/ IEEE-ASHRAE Guide 21 battery-room hydrogen ventilation (NFPA 855 4% LEL), solved for the current; the note repeats the
**cells-not-jars** warning (N is individual 2 V cells; a 12 V jar is six cells, so counting jars overstates the safe
current six-fold) and states that **holding to `I_max` keeps the room-average hydrogen below 1%, local spots near cells
can still exceed the average, and the applicable code and the room design govern**.

## 2. The tile

### 2.1 `battery-vent-max-current` -- Battery Room Max Charge Current from Available Airflow

```
inputs:
  available_cfm   cfm    exhaust airflow the room provides (> 0)
  cell_count      -      individual 2 V CELLS, not jars (>= 1)

I_max = available_cfm / (0.054 x cell_count)   [A]
```

**Pinned worked example (100 cfm, 24 cells).** Q = 100 cfm, N = 24: `I_max = 100 / (0.054 x 24) = 100 / 1.296 = ` **77.2 A**;
feeding 77.2 A back through `battery-hydrogen-vent` at 24 cells returns `Q = 0.054 x 77.2 x 24 = ` **100 cfm**, the input.
**Cross-check (the cells-not-jars trap).** Same 100 cfm but the twenty-four 12 V jars counted as their 144 cells:
`I_max = 100 / (0.054 x 144) = ` **12.9 A** -- one-sixth the current, the same six-fold factor the forward tile flags as
undersizing the fan when jars are mistaken for cells.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `battery-hydrogen-vent`); a `tile-meta.js` `_TILES`
entry; a `citations.js` entry (IEEE 1635 solved for the current, `GOVERNANCE.general`, the cells-not-jars note per §1);
`test/fixtures/worked-examples.json` (both examples); `test/fixtures/compute-map.js` (`battery-vent-max-current` ->
`computeBatteryVentMaxCurrent` in `../../calc-electrical.js`); `scripts/related-tiles.mjs` (-> `battery-hydrogen-vent` /
`standby-battery-sizing` / `off-grid-battery` / `battery-runtime`, and the forward tile links back);
`data/search/aliases.json` ("max charge current for ventilation", "battery charge current limit", "safe charge rate
battery room", plus adjacent rows); `ELECTRICAL_RENDERERS["battery-vent-max-current"]` via a hand-written renderer (the
module's `makeNumber` / `makeOutputLine` / `attachExampleButton` / `debounce` / `fmt` helpers, mirroring
`battery-hydrogen-vent`) and the id added to the calc-electrical declare list in `app.js`; the `// dims:` annotation
directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block
pinning both examples, the cells-not-jars scaling, the round-trip through `computeBatteryHydrogenVent`, and the error
seams (non-finite, non-positive airflow, cell count < 1). The Group A audit-coverage test parses only the original
`// Group A: Electrical` block (this tile is in a later section) and asserts a lower bound, so no count bump. The
calc-electrical.js gzip cap is expected to hold (verify at build). Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, including post-build module-sizes); `npm test` (+2 fixtures, the new
fuzzer block); `npm run build` (one new shell, regenerated sitemap); `npm run data:verify`; worked-examples runner;
320 px audit; render + output read to the value (the pinned example -> 77.2 A over a 24-cell string at 100 cfm).

## 5. Roadmap position

Pairs the forward IEEE 1635 tile (`battery-hydrogen-vent`, airflow from current) with its inverse (current from
airflow), the two halves of the battery-room ventilation question, both carrying the cells-not-jars warning. Further
Group A growth stays evidence-driven.
