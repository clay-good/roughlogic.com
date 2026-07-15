# roughlogic.com Specification v812 -- Scaffold Mudsill Bearing Pressure and Sill Length (calc-construction.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v811.md. Mirrors the accepted `crane-ground-bearing`
> quick-check (calc-rigging) on the scaffold-access side.
>
> **The gap, and the evidence for it.** The catalog checks crane outrigger bearing (`crane-ground-bearing`) but nothing
> checks the **scaffold mudsill** -- the plank under a scaffold base plate that spreads the leg load onto the soil. Grep
> confirmed no scaffold / mudsill tile. OSHA 1926.451(c)(2) requires scaffold legs on base plates and mudsills on a firm,
> rigid foundation; the number this settles: a 4,000 lb leg on a 2x10 mudsill only 24 in long presses **2,595 psf** onto a
> 2,000 psf soil -- an overstress -- and the sill has to grow to about **31 in** to bring the bearing under the allowable.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the accepted
`crane-ground-bearing` sibling: the leg load carries force `M L T^-2`, the plank width and length `L`, the allowable soil
bearing `M L^-1 T^-2`, the mudsill area `L^2`, and the computed bearing pressure `M L^-1 T^-2`. The v18/v21 contract: a
non-finite or non-positive leg load, plank width, plank length, or allowable bearing returns `{ error }`. Citation
discipline (v19/v22): the bearing-pressure identity by name (pressure = leg load / mudsill area, compared to allowable
soil bearing) with OSHA 1926.451(c)(2) as the foundation requirement, `GOVERNANCE.general`; the note states that the
manufacturer's allowable base-plate load and the geotechnical allowable soil bearing govern -- "looks solid" is not a
number -- that mudsills must be sound and rigid, that frost, voids, backfill, slopes, and adjacent excavations all cut
capacity, and that a competent person verifies the setup. This is a first-check estimator, not the engineered design.

## 2. The tile

### 2.1 `scaffold-mudsill-bearing` -- Scaffold Mudsill Bearing Pressure and Sill Length

```
inputs:
  leg_load_lb        load carried by one scaffold leg / base plate (lb)
  plank_width_in     mudsill board width (in, e.g. 9.25 for a 2x10)
  plank_length_in    provided mudsill length (in)
  allowable_psf      allowable soil bearing (psf)

mudsill_area_ft2   = (plank_width_in * plank_length_in) / 144
bearing_psf        = leg_load_lb / mudsill_area_ft2
required_area_ft2  = leg_load_lb / allowable_psf
required_length_in = required_area_ft2 * 144 / plank_width_in
pass               = bearing_psf <= allowable_psf
```

**Pinned worked example.** Leg load 4,000 lb, mudsill a 2x10 (9.25 in wide) x 24 in long, allowable 2,000 psf:
`area = 9.25 * 24 / 144 = ` **1.542 ft^2**; `bearing = 4000 / 1.542 = ` **2,595 psf** -- over the 2,000 psf allowable, so
it **fails**. `required area = 4000 / 2000 = 2.0 ft^2`, so `required length = 2.0 * 144 / 9.25 = ` **31.1 in**: a 32 in
sill under the same board brings the bearing to `4000 / (9.25 * 32 / 144) = ` **1,946 psf**, under the allowable.
Cross-check: widening instead to a doubled 2x10 (18.5 in) at the original 24 in length gives 3.083 ft^2 and 1,297 psf --
either lengthen the sill or widen it.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "carpentry"]`, inside the `// Group E` construction block beside
`shore-post-load`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (pressure = leg load / area vs allowable, OSHA 1926.451(c)(2), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned fail-then-fix example plus the widen-the-sill cross-check);
`test/fixtures/compute-map.js` (`scaffold-mudsill-bearing` -> `computeScaffoldMudsillBearing`, module
`../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `crane-ground-bearing` / `shore-post-load` /
`soil-bearing-capacity`); `data/search/aliases.json` (5 collision-checked aliases: "scaffold mudsill bearing", "scaffold
base plate soil pressure", "mudsill size for scaffold leg", "scaffold foundation bearing", "sill plank soil pressure"); a
hand-written renderer in the `CONSTRUCTION_RENDERERS` map mirroring the `crane-ground-bearing` verdict renderer
(non-exported, so no DOM-sentinel dims row), and the id added to the calc-construction declare list in `app.js`; the
`// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings; a
`bounds-fuzzer.test.js` block pinning the area, bearing pressure, the pass flag, the required length, and the error seams
(non-positive leg load, width, length, allowable). The calc-construction.js gzip cap is watched at build. Verify at build,
including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint. Home tile count
1,260 -> 1,261.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(4000 / (9.25 * 24 / 144) -> 2,595 psf, fails 2,000 psf).

## 5. Roadmap position

Extends the ground-bearing quick-check family (`crane-ground-bearing`) to scaffold access, serving the scaffold erector
and general contractor (construction / carpentry). Pairs with `shore-post-load` (formwork) and `soil-bearing-capacity`
(the allowable the geotech supplies). Next candidate in the access vein: scaffold leg load from tributary platform area.
Stays evidence-driven; the engineered design still governs.
