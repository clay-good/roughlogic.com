# roughlogic.com Specification v296 -- Wind Components and Cladding Pressure (ASCE 7 Ch. 30) (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-02, package 0.97.0). Batch spec-v296..v298 (the ASCE 7 wind-and-snow load depth trio -- the
> load cases the single velocity-pressure and flat-snow tiles never build: the components-and-cladding suction on a roof or
> wall zone (this spec), the snow drift surcharge at a step or parapet (v297), and the main-wind-force design pressure on
> the building (v298).)**
> In-scope catalog expansion under the spec-v106 trades-only charter: `wind-pressure` returns only the velocity pressure
> `q = 0.00256 V^2` with a simple windward/leeward `Cp`; it never applies the ASCE 7 Chapter 30 components-and-cladding
> coefficients that size a fastener, a window, or a roof panel -- the high local suctions at corners and edges that govern
> the envelope. Adds one tile to the existing **`calc-construction.js`** module (Group E); no new group, trade, or
> dependency. Inherits spec.md through spec-v295.md.
>
> **The gap, and the evidence for it.** ASCE 7 Chapter 30 takes the components-and-cladding design pressure as
> `p = qh [(GCp) - (GCpi)]`, where `qh = 0.00256 Kz Kzt Kd Ke V^2` is the velocity pressure at mean roof height, `GCp` is
> the external pressure coefficient for the zone and effective wind area (from the figures), and `GCpi = +/-0.18` for an
> enclosed building. For a 115 mph, Exposure C building 20 ft tall (`Kz = 0.90`, `Kd = 0.85`), `qh = 25.9 psf`, and a roof
> corner (Zone 3) with `GCp = -1.8`, the worst suction is `p = 25.9 (-1.8 - 0.18) = -51.3 psf` -- the uplift a corner
> fastener and its spacing are designed for, roughly double the field pressure, and a number `wind-pressure` cannot produce.
> `wind-pressure` gives the stagnation pressure; this tile gives the local design pressure on the cladding.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. The basic wind speed `V` is a
speed (mph); the exposure/height coefficient `Kz`, topographic `Kzt`, directionality `Kd`, ground-elevation `Ke`, external
`GCp`, and internal `GCpi` coefficients are dimensionless; the velocity pressure `qh` and design pressure `p` are pressures
(psf). The v18/v21 contract: any non-finite input, a wind speed or coefficient at or below zero (for `V`, `Kz`), returns
`{ error }`; both internal-pressure signs are evaluated and the governing (largest magnitude) reported. Citation discipline
(v19/v22): `GOVERNANCE.general` over the ASCE 7 Chapter 30 C&C provisions by name; `editionNote` names **the ASCE 7-22
Chapter 30 C&C design pressure `p = qh [(GCp) - (GCpi)]`, the velocity pressure `qh = 0.00256 Kz Kzt Kd Ke V^2` with
`Kd = 0.85` and `GCpi = +/-0.18` (enclosed), and that `GCp` is read from the Ch. 30 figures for the zone and effective wind
area**, and states that **this returns the C&C design pressure for an entered `GCp` and `qh` (or a computed `qh` from the
coefficients) -- it does not read the zone figures for the user (enter `GCp` for the roof/wall zone and effective wind
area), assumes an enclosed building unless `GCpi` is changed, and does not cover the MWFRS pressures (that is v298,
`wind-mwfrs-pressure`) or the parapet/overhang special cases; and this is a design aid, not a substitute for the engineer of
record** -- the structural engineer of record's stamped design governs.

## 2. The tile

### 2.1 `wind-cc-pressure` -- Wind Components and Cladding Pressure (ASCE 7 Ch. 30)

```
inputs:
  V_mph    mph   basic wind speed
  Kz       -     velocity-pressure exposure coefficient (at mean roof height)
  GCp      -     external pressure coefficient for the zone/effective area (signed)
  Kzt      -     topographic factor (default 1.0)
  Kd       -     directionality factor (default 0.85)
  Ke       -     ground-elevation factor (default 1.0)
  GCpi     -     internal pressure coefficient magnitude (default 0.18 enclosed)

qh = 0.00256 * Kz * Kzt * Kd * Ke * V_mph^2                 ; velocity pressure, psf
p_a = qh * (GCp - GCpi)                                     ; with +GCpi, psf
p_b = qh * (GCp + GCpi)                                     ; with -GCpi, psf
p_gov = the one of {p_a, p_b} with the larger magnitude     ; governing design pressure
```

**Pinned worked example (115 mph, Exposure C, 20 ft roof, corner Zone 3 GCp = -1.8).** `V = 115`, `Kz = 0.90`, `Kzt = 1`,
`Kd = 0.85`, `Ke = 1`, `GCp = -1.8`, `GCpi = 0.18`: `qh = 0.00256 x 0.90 x 0.85 x 115^2 = 25.9 psf`;
`p_a = 25.9 (-1.8 - 0.18) = -51.3 psf`, `p_b = 25.9 (-1.8 + 0.18) = -42.0 psf`; the governing (largest magnitude) is the
`-51.3 psf` suction at the corner. **Cross-check (a wall Zone 5 corner, GCp = -1.4).** Same `qh`: `p_a = 25.9(-1.4 - 0.18) = -40.9 psf`
-- lower than the roof corner, the reason roof corners drive the fastening schedule. The non-finite and non-positive-`V`/`Kz`
error paths bracket the result.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["carpentry","construction"]`, matching `wind-pressure`); a `tile-meta.js`
`_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the ASCE 7 Ch. 30 provisions, `editionNote` naming
`p = qh(GCp - GCpi)`, `qh = 0.00256 Kz Kzt Kd Ke V^2`, `GCpi = +/-0.18`, and the enter-GCp, enclosed-default, not-MWFRS
caveats); `test/fixtures/worked-examples.json` (the roof-corner example + the wall-corner cross-check);
`test/fixtures/compute-map.js` (`wind-cc-pressure` -> `computeWindCcPressure` in `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `wind-pressure` / `wind-mwfrs-pressure` / `asce7-load-combinations` / `snow-load`);
`data/search/aliases.json` ("components and cladding", "C&C wind", "GCp", "roof uplift pressure", "ASCE 7 chapter 30",
"cladding pressure", "corner zone suction", "window design pressure", "fastener wind uplift"); the id appended to the
existing construction renderers block in `app.js`; the `// dims:` annotation (`V` speed, coefficients dimensionless, `qh`/
`p` pressure); regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning both examples, the two-GCpi-sign
governing selection, the `V^2` scaling, and the non-positive / non-finite error seams. No new module; re-pin
`calc-construction.js` on the `check:module-sizes` allowlist. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1 tile**); `npm test`
(+2 fixtures, the new fuzzer block, the error paths, the governing-sign assertion); `npm run build` (one new shell,
regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the `qh` / `p_a` / `p_b` / `p_gov`
stack wraps on a phone); render-no-nan + a11y sweep, output read to the value (115 mph corner -> qh 25.9, -51.3 psf).

## 5. Roadmap position

Opens the ASCE 7 wind-and-snow load depth batch (v296..v298) in `calc-construction.js`, adding the local envelope pressures
beside the stagnation-pressure `wind-pressure`. Snow drift (v297) and the MWFRS pressure (v298) follow. A built-in `GCp`
zone-figure lookup by roof slope and effective wind area, the parapet/overhang cases, and the `Kz` table by exposure and
height are the deliberate next follow-ons once the trio lands.
