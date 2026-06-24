# roughlogic.com Specification v134 -- Interference Shrink-Fit Heating and Chilling Temperature (calc-fab.js, Group G, 1 New Tile)

> **Status: LANDED 2026-06-23 (catalog 615, package 0.74.0). Batch spec-v129..v135.** In-scope catalog expansion under the
> spec-v106 trades-only charter: one fabrication tile from the first-principles thermal-expansion
> relation for an interference fit, fabricator-and-engineer governed, redo-not-harm. Adds one tile
> to **`calc-fab.js`** (Group G); no new module, group, or dependency. Inherits spec.md through
> spec-v133.md.
>
> **The gap, and the evidence for it.** The catalog has flange-bolt and weld-joint math but never
> the millwright's assembly question: to slip a hub, bearing, ring gear, or bushing onto a shaft
> with a press interference, how hot must the part be heated (or how cold the shaft chilled) to open
> the bore enough to drop on by hand? It is a one-line thermal calc done wrong by guessing oven
> temperature, and it has no tile.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Nominal diameter, diametral interference, and assembly clearance are `L`; the coefficient of thermal
expansion is per-degree (`T^-1` in the temperature sense, matching the v112/v126 temperature
convention), and the required temperature change is temperature `T`. The bundled steel coefficient
(6.5 x 10^-6 per deg-F) and the default ambient (70 deg-F) are annotated editable fields. The
v18/v21 contract: any non-finite input, a non-positive diameter or coefficient, or a negative
interference, returns `{ error }`; the only division is by the guarded-positive coefficient-times-
diameter product. Citation discipline (v19/v22): `GOVERNANCE.general` over the thermal-growth
relation `delta_dia = alpha x dia x delta_T`; the alloy's published coefficient governs the number,
and the interference contact pressure (a separate Lame thick-cylinder analysis) and the engineer
govern the joint's holding capacity -- this tile sizes only the assembly temperature.

## 2. The tile

### 2.1 `shrink-fit` -- Heating / Chilling Temperature for an Interference Fit

```
inputs:
  nominal_dia_in   L              nominal fit diameter (the shaft / bore)
  interference_in  L              diametral interference (shaft minus bore at ambient)
  clearance_in     L              extra diametral clearance wanted to assemble (default 0.001 x dia)
  alpha_per_f      T^-1           coefficient of thermal expansion (default 0.0000065 steel)
  ambient_f        T              starting temperature (default 70)

delta_T_f      = (interference_in + clearance_in) / (alpha_per_f x nominal_dia_in)
heat_to_f      = ambient_f + delta_T_f          # heat the outer (bore) part this hot
chill_to_f     = ambient_f - delta_T_f          # or chill the inner (shaft) part this cold
```

**Pinned worked example.** A 4.000 in fit with 0.004 in interference, 0.002 in assembly clearance,
steel alpha 6.5e-6/deg-F, 70 deg-F ambient: `delta_T = (0.004 + 0.002) / (0.0000065 x 4) = 0.006 /
0.000026 = 231 deg-F`; `heat_to = 70 + 231 = 301 deg-F` -- a ~300 deg-F oven or induction heater
opens the bore to drop on by hand. **Cross-check (chill the shaft instead).** The same 231 deg-F
change applied as a drop: `chill_to = 70 - 231 = -161 deg-F` -- below dry ice (-109 deg-F), so this
one needs liquid nitrogen, the flag a tech needs before reaching for the cooler. The published alloy
coefficient and a separate interference-pressure check govern.

## 3. Wiring

A `tools-data.js` row (group `G`, trade `["fabrication", "machinist", "mechanic"]`); a
`tile-meta.js` `_TILES` entry; a `citations.js` entry (`GOVERNANCE.general`, the delta_dia = alpha x
dia x delta_T relation, the 6.5e-6 steel coefficient and ambient default listed, `editionNote`
single-edition first-principles noting alloy-coefficient variation and the out-of-scope Lame contact
pressure); `test/fixtures/worked-examples.json` (example + cross-check); `test/fixtures/compute-
map.js` (`shrink-fit` -> `computeShrinkFit` in `../../calc-fab.js`); `scripts/related-tiles.mjs` (->
`metal-weight` / `flange-bolt-torque` / `conduit-thermal-expansion`); `data/search/aliases.json`
("shrink fit", "interference fit", "press fit", "heat to assemble", "thermal fit", "bore
expansion"); the id appended to the existing `FAB_RENDERERS` declare in `app.js`; the `// dims:`
annotation; regenerated v14 corpus + tile-index; a `bounds-fuzzer.test.js` block pinning the
example, cross-check (chill path), and error seams (non-finite, dia/alpha <= 0, interference < 0).
Raise the `calc-fab.js` size cap by ~20 percent if needed (dated comment); bump the `citations.js`
cap if needed. Lazy-loaded, absent from home first paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` re-pinned **+1
tile**); `npm test` (+2 fixtures, the new fuzzer block); `npm run build` (one new shell, regenerated
sitemap); `npm run data:verify`; worked-examples runner; 320 px audit (the delta-T, heat-to, and
chill-to lines wrap on a phone); render-no-nan + a11y sweep, output read to the value (4 in /
0.004 in interference -> 231 deg-F rise, heat to 301 deg-F).

## 5. Roadmap position

Adds the assembly-thermal calc to the shop-fabrication family. Pairs dimensionally with
`conduit-thermal-expansion` (v126). Further Group G growth stays evidence-driven.
