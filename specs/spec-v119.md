# roughlogic.com Specification v119 -- Equilibrium Moisture Content of Wood (calc-restoration.js, Group D, 1 New Tile)

> **Status: LANDED 2026-06-20 (package 0.70.0, catalog 676 -> 687 across spec-v112..v119).** In-scope catalog expansion under
> the spec-v106 charter: one restoration tile from the public-domain USDA Forest Products
> Laboratory sorption equation, IICRC-and-AHJ governed, redo-not-harm. Adds one tile to
> **`calc-restoration.js`** (Group D); no new module, group, or dependency. Inherits spec.md
> through spec-v118.md.
>
> **The gap, and the evidence for it.** Group D sets drying goals from grain depression and tracks
> boundary readings (`Drying Goal`, `Moisture Removed by Grain Depression`, `Dry Standard vs
> Affected Reading`) but never computes the equilibrium moisture content wood will reach at a given
> room temperature and relative humidity. EMC is the physical endpoint a tech is drying toward and
> is also the everyday "will this floor/framing reach my dry standard at these conditions?"

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply.
Temperature is `T`, relative humidity and EMC are dimensionless (percent). The bundled
temperature-dependent coefficients are facts from the public-domain FPL equation, annotated. The
v18/v21 contract: any non-finite input, a temperature at or below absolute zero, or an RH outside
[0, 100), returns `{ error }`. Citation discipline (v19/v22): `GOVERNANCE.general` over the USDA
FPL Wood Handbook sorption equation (Hailwood-Horrobin / Simpson), a US-government public-domain
work; the wood-species variation and the IICRC dry standard govern.

## 2. The tile

### 2.1 `wood-emc` -- Equilibrium Moisture Content of Wood (USDA FPL)

```
inputs:
  temperature_F   T              air dry-bulb temperature
  rh_pct          dimensionless  relative humidity

h  = rh_pct / 100
W  = 330 + 0.452 T + 0.00415 T^2
K  = 0.791 + 0.000463 T - 0.000000844 T^2
K1 = 6.34 + 0.000775 T - 0.0000935 T^2
K2 = 1.09 + 0.0284 T - 0.0000904 T^2          (T in degrees F)
EMC% = (1800/W) [ Kh/(1-Kh) + (K1 K h + 2 K1 K2 K^2 h^2) / (1 + K1 K h + K1 K2 K^2 h^2) ]
```

**Pinned worked example.** 70 F, 50 percent RH -> EMC ~= 9.1 percent (the textbook value for
standard interior conditions). **Cross-check:** 70 F, 30 percent RH -> EMC ~= 6.2 percent (drier
air, lower endpoint). The exact value varies by species; the IICRC dry standard and the unaffected
reference reading govern when a material is "dry."

## 3. Wiring

A `tools-data.js` row (group `D`, trade `["restoration"]`); a `tile-meta.js` `_TILES` entry; a
`citations.js` entry (`GOVERNANCE.general`, USDA FPL Wood Handbook sorption equation, the four
coefficient polynomials listed); worked-examples fixtures (example + cross-check, with a tolerance
band since the formula is continuous); `compute-map.js` (`wood-emc` -> `computeWoodEmc` in
`../../calc-restoration.js`); `related-tiles.mjs` (-> `drying-goal` / `dry-standard-vs-affected` /
`moisture-removed-by-grain-depression`); `data/search/aliases.json` ("equilibrium moisture
content", "emc", "wood moisture target", "dry standard", "sorption"); the id appended to the
existing `RESTORATION_RENDERERS` declare in `app.js`; the `// dims:` annotation; regenerated corpus
+ tile-index; a `bounds-fuzzer.test.js` block pinning the example and cross-check (band-checked),
monotonicity (EMC rises with RH), and error seams. Raise the `calc-restoration.js` size cap by ~20
percent if needed; bump the `citations.js` cap if needed. Lazy-loaded, absent from home first
paint.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint` (all gates, em-dash ban, `check-readme-counts` +1 tile);
`npm test` (+2 fixtures band-checked, the new fuzzer block); `npm run build` (one new shell,
regenerated sitemap); `data:verify`; worked-examples runner; 320 px audit (the EMC line wraps);
render-no-nan + a11y sweep, output read to the value (70 F / 50% RH -> ~9.1%).

## 5. Roadmap position

Adds the physical drying endpoint to the restoration moisture family. The species variation is a
future candidate for a representative-defaults selector. Further Group D growth stays
evidence-driven.
