# roughlogic.com Specification v143 -- Surface Condensation Risk and Dew-Point Margin (calc-restoration.js, Group D, 1 New Tile)

> **Status: PROPOSED 2026-06-23 (DEFERRED 2026-06-29: held back as conceptually adjacent to live water and mold tiles when the fire and smoke subset v141/v146-v148/v152-v154 landed at 0.85.0). Batch spec-v141..v145.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one water-restoration tile that compares the chamber air's dew point
> to a cold-surface temperature and flags where the drying setup will make new water by condensation.
> Adds one tile to **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits
> spec.md through spec-v142.md.
>
> **The gap, and the evidence for it.** `psychrometric` reports a dew point, but the failure mode it
> never screens is the one that bites in cold weather: warm, humid drying air meeting a cold single-
> pane window, an uninsulated exterior wall, or a slab edge, and condensing there -- secondary water
> the tech did not extract, in the worst place for mold. S500 warns to keep surface temperatures above
> the dew point. The dew point follows the published Magnus relation from air temperature and relative
> humidity, and the risk is simply whether the surface sits below it and by what margin, yet no tile
> makes that comparison.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply. Air
temperature, the computed dew point, the surface temperature, and the margin are `Theta` (degF);
relative humidity is `dimensionless` (percent, bounded 0..100, exclusive of 0 for the logarithm). The
Magnus coefficients (17.625 and 243.04 degC) and the degF/degC conversion are dimensioned constants
drawn from `pure-math.js` convention. The v18/v21 contract: any non-finite input, or a relative
humidity outside (0, 100], returns `{ error }`; the Magnus denominator is structurally positive across
the valid humidity range and is guarded. Citation discipline (v19/v22): `GOVERNANCE.general` over the
Magnus dew-point relation and the keep-surfaces-above-dew-point rule, by name; the Magnus form is an
approximation and `psychrometric` is the chamber reference -- this is a screen, the actual surface
temperature (read with an IR thermometer) governs.

## 2. The tile

### 2.1 `surface-condensation-risk` -- Surface Condensation Risk and Dew-Point Margin

```
inputs:
  air_temp_f      Theta          chamber air temperature
  air_rh_pct      dimensionless  chamber relative humidity (0..100)
  surface_temp_f  Theta          coldest surface of concern (window / exterior wall / slab), IR read

# Magnus dew point in degC from T_c = (air_temp_f - 32) x 5/9:
g          = ln(air_rh_pct/100) + 17.625 x T_c / (243.04 + T_c)
dew_pt_c   = 243.04 x g / (17.625 - g)
dew_pt_f   = dew_pt_c x 9/5 + 32
margin_f   = surface_temp_f - dew_pt_f
condensing = margin_f <= 0        # surface at/below dew point -> water forms there
```

**Pinned worked example.** Chamber at 80 degF, 50 percent RH, against a single-pane window at 50 degF:
`T_c = 26.67`; `g = ln(0.5) + 17.625 x 26.67 / 269.71 = -0.693 + 1.743 = 1.050`;
`dew_pt_c = 243.04 x 1.050 / (17.625 - 1.050) = 15.4 degC = 59.7 degF`; `margin = 50 - 59.7 = -9.7
degF` -> **condensing** on the glass.
**Cross-check (drying the air clears it).** Pull the chamber to 30 percent RH at the same 80 degF:
`g = ln(0.30) + 1.743 = 0.539`, `dew_pt = 7.7 degC = 45.8 degF`, `margin = 50 - 45.8 = +4.2 degF` ->
no condensation on the 50 degF surface. Lower the humidity or warm the surface to clear the risk; the
IR-read surface temperature governs.

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, the Magnus dew-point relation and the surface-above-dew-
point rule, `editionNote` naming ANSI/IICRC S500 and the Magnus-approximation caveat, the screen
scope); `test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-map.js`
(`surface-condensation-risk` -> `computeSurfaceCondensationRisk` in `../../calc-restoration.js`);
`scripts/related-tiles.mjs` (-> `psychrometric` / `drying-goal` / `mold-conditions`);
`data/search/aliases.json` ("dew point", "condensation", "cold surface", "window sweating", "surface
temperature", "secondary damage"); the id appended to the existing `RESTORATION_RENDERERS` declare in
`app.js`; the `// dims:` annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js`
block pinning the example, cross-check, the condensing/clear boundary, and error seams (non-finite, RH
outside (0,100]). Raise the `calc-restoration.js` size cap by ~20 percent if needed (dated comment);
bump the `citations.js` cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block, the boundary case); `npm run build` (one new
shell, regenerated sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the dew
point, margin, and flag wrap on a phone); render-no-nan + a11y sweep, output read to the value (80 degF
/ 50 pct / 50 degF -> 59.7 degF dew point, -9.7 degF margin, condensing).

## 5. Roadmap position

Adds the cold-weather secondary-damage screen to the chamber-management family, consuming the same
psychrometric inputs as `drying-goal` and feeding the mold-condition read. Further Group D growth stays
evidence-driven.
