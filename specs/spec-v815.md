# roughlogic.com Specification v815 -- Asphalt Tack / Prime Coat Quantity (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED 2026-07-16 (package 0.398.0).** Executed against the live catalog (1,263 -> 1,264 tiles), via the
> `_simpleRenderer` factory beside `asphalt-paving-speed` in calc-construction.js. Single-tile spec.
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v814.md. Paving sweep (entry 2), beside
> `asphalt-tonnage` and the new `asphalt-paving-speed`.
>
> **The gap, and the evidence for it.** The catalog quantifies the mat (`asphalt-tonnage`) and paint DFT
> (`coating-coverage-dft`) but nothing gives the **tack / prime coat emulsion** an asphalt crew sprays between lifts,
> where the DOT spec sets a *residual* rate (asphalt left after the water breaks) but the truck meters *emulsion*. Grep
> confirmed no tack / prime coat tile. The number this settles: a 0.04 gal/sy residual over a 10,000 sf lane needs
> **74 gallons** of a 60%-residue emulsion, not the 44 gallons the residual figure alone suggests -- the difference the
> residue fraction hides.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
construction siblings (`asphalt-tonnage`, `coating-coverage-dft`): the area carries `L^2`, the residual and per-area rates
are volume-per-area (`L`, gal/sy reduces to a length), the residue fraction is dimensionless, and the gallon totals are
`L^3`. The v18/v21 contract: a non-finite or non-positive area, residual rate, or residue percent returns `{ error }`; a
residue percent outside 0-100 returns `{ error }`. Citation discipline (v19/v22): the coverage identity by name (emulsion
gallons = area / 9 x residual rate / residue fraction), `GOVERNANCE.general`; the note states that the DOT specification
or the engineer sets the residual application rate (typically 0.02-0.08 gal/sy for tack, higher for prime), that the
emulsion residue fraction (roughly 0.55-0.65 for common SS / CSS grades) comes from the supplier's data sheet, and that
the sprayed rate governs bond -- too much tack bleeds and slips, too little delaminates.

## 2. The tile

### 2.1 `asphalt-tack-coat-quantity` -- Asphalt Tack / Prime Coat Quantity

```
inputs:
  area_sf              area to shoot (ft^2)
  residual_rate_gal_sy residual (asphalt) application rate (gal/sy, default 0.04)
  residue_pct          emulsion asphalt residue (percent, default 60)

area_sy            = area_sf / 9
undiluted_gal_sy   = residual_rate_gal_sy / (residue_pct / 100)
emulsion_gallons   = undiluted_gal_sy * area_sy
residual_gallons   = residual_rate_gal_sy * area_sy
```

**Pinned worked example.** Area 10,000 sf, residual 0.04 gal/sy, residue 60%:
`area = 10000 / 9 = ` **1,111.1 sy**; `undiluted = 0.04 / 0.60 = ` **0.0667 gal/sy**;
`emulsion = 0.0667 * 1111.1 = ` **74.1 gal**; `residual = 0.04 * 1111.1 = ` **44.4 gal**. Cross-check: a lighter
0.03 gal/sy tack drops the emulsion order to `0.03/0.60 * 1111.1 = ` **55.6 gal** -- the residual rate the spec sets is
the lever, and the residue fraction always grosses the order up.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, inside the `// Group E` construction block beside
`asphalt-tonnage`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (emulsion gallons = area/9 x residual / residue fraction, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the lighter-rate cross-check); `test/fixtures/compute-map.js`
(`asphalt-tack-coat-quantity` -> `computeAsphaltTackCoatQuantity`, module `../../calc-construction.js`);
`scripts/related-tiles.mjs` (-> `asphalt-tonnage` / `asphalt-paving-speed` / `coating-coverage-dft`);
`data/search/aliases.json` (5 collision-checked aliases: "tack coat quantity", "prime coat gallons", "asphalt emulsion
coverage", "tack coat application rate", "residual to emulsion gallons"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring the `coating-coverage-dft` renderer (non-exported, so no DOM-sentinel dims row), and
the id added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the square-yard area, the
undiluted rate, both gallon totals, and the error seams (non-positive area, residual rate; residue percent out of 0-100).
The calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,263 -> 1,264.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.04 / 0.60 * (10000/9) -> 74.1 gal).

## 5. Roadmap position

Extends the paving family (`asphalt-tonnage`, `asphalt-paving-speed`) to the tack / prime coat the crew shoots between
lifts, serving the paving contractor (construction / carpentry). Distinct from the paint-film `coating-coverage-dft`. Stays
evidence-driven; the DOT spec sets the residual rate.
