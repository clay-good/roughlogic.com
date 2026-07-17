# roughlogic.com Specification v864 -- Tapered Roof Insulation Average Thickness and Quantity (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v863.md. Roofing / insulation sweep, beside
> `membrane-roof-takeoff` and `assembly-r-value`.
>
> **The gap, and the evidence for it.** Nothing handles **tapered roof insulation** -- the average thickness across a slope-
> to-drain layout, the board-feet to order, and the average R the taper delivers. Grep confirmed no tapered-insulation
> tile (`assembly-r-value` is a steady flat R). The number this settles: a 40 ft run at 1/4 in per foot off a 1/2 in start
> averages **5.5 in**, so a 2,000 sf field is **11,000 board-feet** and about **R-31** on average -- the order and the
> code-R check for a low-slope roof.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
roofing / insulation siblings (`membrane-roof-takeoff`, `assembly-r-value`): the run, start thickness, and average
thickness carry `L`, the slope (in/ft) and R-per-inch are dimensionless, the area is `L^2`, the board-feet is `L^3` (a
square-foot-inch volume), and the average R is dimensionless. The v18/v21 contract: a non-finite or non-positive run,
area, or R-per-inch returns `{ error }`; a negative slope or start thickness returns `{ error }`. Citation discipline
(v19/v22): the tapered identity by name (average thickness = start + slope x run / 2; board-feet = area x average
thickness; average R = average thickness x R-per-inch), `GOVERNANCE.general`; the note states that the taper layout (slope
and start thickness) comes from the manufacturer's design to hit both the code drainage slope (a low-slope roof needs at
least 1/4 in per foot) and the design R, that tapered polyiso is ordered by the board-foot (a square foot one inch thick),
and that this is distinct from the steady flat `assembly-r-value`.

## 2. The tile

### 2.1 `tapered-roof-insulation` -- Tapered Roof Insulation Average Thickness and Quantity

```
inputs:
  run_ft           taper run length to drain (ft)
  slope_in_per_ft  taper slope (in/ft, default 0.25)
  start_thk_in     thickness at the low (start) edge (in, default 0.5)
  area_sf          field area (ft^2)
  r_per_in         insulation R per inch (default 5.7)

avg_thk_in = start_thk_in + slope_in_per_ft * run_ft / 2
board_feet = area_sf * avg_thk_in
avg_r      = avg_thk_in * r_per_in
```

**Pinned worked example.** Run 40 ft, slope 1/4 in/ft, start 1/2 in, area 2,000 sf, R 5.7/in:
`avg = 0.5 + 0.25*40/2 = ` **5.5 in**; `board-feet = 2000*5.5 = ` **11,000**; `avg R = 5.5*5.7 = ` **31.4**. Cross-check:
a shallower 1/8 in/ft taper averages `0.5 + 0.125*40/2 = ` **3.0 in** -- **6,000 board-feet** and only **R-17** -- which
is why the slope has to serve both drainage and the code R.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing", "insulation"]`, inside the `// Group E` construction block near
`assembly-r-value`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (avg thickness = start + slope x run / 2; board-feet = area x avg, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the shallow-slope cross-check); `test/fixtures/compute-map.js`
(`tapered-roof-insulation` -> `computeTaperedRoofInsulation`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `assembly-r-value` / `membrane-roof-takeoff` / `roof-underlayment-rolls`);
`data/search/aliases.json` (5 collision-checked aliases: "tapered roof insulation", "tapered iso board feet", "roof taper
average thickness", "tapered insulation quantity", "slope to drain insulation"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring a simple output renderer (non-exported, so no DOM-sentinel dims row), and the id
added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the average thickness,
board-feet, average R, and the error seams (non-positive run, area, R-per-in; negative slope or start). The
calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,312 -> 1,313.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.5 + 0.25*40/2 -> 5.5 in, 11,000 board-feet).

## 5. Roadmap position

Roofing / insulation tile beside `membrane-roof-takeoff` and the steady `assembly-r-value`, serving the commercial roofer
(roofing / insulation). Stays evidence-driven; the manufacturer's taper design governs.
