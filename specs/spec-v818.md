# roughlogic.com Specification v818 -- Conical Stockpile Volume and Tonnage (calc-construction.js, Group E, 1 New Tile)

> **Status: LANDED 2026-07-16 (package 0.398.0).** Executed against the live catalog (1,267 -> 1,268 tiles), via the
> `_simpleRenderer` factory in calc-construction.js. Single-tile spec.
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-construction.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v817.md. Materials sweep, beside the `aggregate` and
> `material-quantity` take-off tiles.
>
> **The gap, and the evidence for it.** The catalog takes off placed material (`aggregate`, `material-quantity`) but
> nothing measures a **stockpile** -- the free-standing cone of sand, stone, or spoil whose volume a grading crew or
> materials yard has to inventory from a base measurement. Grep confirmed no stockpile / conical / angle-of-repose tile.
> The number this settles: a 60 ft-diameter pile of crushed stone at a 37 degree repose angle stands **22.6 ft** tall and
> holds about **789 cy** -- roughly **1,065 tons** at 100 pcf -- the figure that reconciles a delivered quantity against
> what is on the ground.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
construction siblings (`aggregate`, `concrete`): the base diameter carries `L`, the repose angle is dimensionless
(degrees), the density is `M L^-3`, the height is `L`, the volume is `L^3`, and the tonnage is `M`. The v18/v21 contract:
a non-finite or non-positive base diameter or density returns `{ error }`; a repose angle outside 0-90 (exclusive)
returns `{ error }`. Citation discipline (v19/v22): the right-circular-cone identity by name (height = radius x tan(repose);
volume = 1/3 x pi x radius^2 x height), `GOVERNANCE.general`; the note states that the pile is idealized as a clean cone
on flat ground -- an irregular base, a flat top, or a pile against a wall all change it -- that the angle of repose depends
on the material and its moisture (roughly 30-40 degrees for granular material), and that a survey volume governs for
payment.

## 2. The tile

### 2.1 `stockpile-volume` -- Conical Stockpile Volume and Tonnage

```
inputs:
  base_diameter_ft   pile base diameter (ft)
  repose_angle_deg   angle of repose (degrees, default 37)
  density_pcf        loose bulk density (pcf, default 100)

radius_ft   = base_diameter_ft / 2
height_ft   = radius_ft * tan(repose_angle_deg * PI/180)
volume_ft3  = (1/3) * PI * radius_ft^2 * height_ft
volume_cy   = volume_ft3 / 27
tons        = volume_ft3 * density_pcf / 2000
```

**Pinned worked example.** Base 60 ft, repose 37 degrees, density 100 pcf:
`radius = 30`, `height = 30 * tan(37) = ` **22.6 ft**; `volume = (1/3)*PI*30^2*22.6 = ` **21,306 ft^3** (789 cy);
`tons = 21,306 * 100 / 2000 = ` **1,065 tons**. Cross-check: a wetter pile standing at 40 degrees on the same 60 ft base
rises to `30 * tan(40) = 25.2 ft` and **878 cy** -- the repose angle, which steepens as the material gets damp or angular,
is the lever that moves both the height and the volume.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` construction block beside
`aggregate`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a `citations.js`
entry (cone volume = 1/3 pi r^2 h, h = r tan(repose), `GOVERNANCE.general`); `test/fixtures/worked-examples.json` (the
pinned example plus the wetter-repose cross-check); `test/fixtures/compute-map.js` (`stockpile-volume` ->
`computeStockpileVolume`, module `../../calc-construction.js`); `scripts/related-tiles.mjs` (-> `aggregate` /
`soil-swell-shrink` / `material-quantity`); `data/search/aliases.json` (5 collision-checked aliases: "stockpile volume",
"conical pile volume", "gravel pile tonnage", "sand pile volume", "angle of repose pile"); a hand-written renderer in the
`CONSTRUCTION_RENDERERS` map mirroring the `aggregate` renderer (non-exported, so no DOM-sentinel dims row), and the id
added to the calc-construction declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated
v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the height, the cubic-foot and cubic-
yard volumes, the tonnage, and the error seams (non-positive diameter or density; repose angle out of 0-90). The
calc-construction.js gzip cap is watched at build. Verify at build, including `check-shells` and `check-module-sizes`
post-build. Lazy-loaded, absent from home first paint. Home tile count 1,266 -> 1,267.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
((1/3)*PI*30^2*(30*tan(37deg)) -> 21,306 ft^3, 789 cy).

## 5. Roadmap position

Adds stockpile inventory beside the `aggregate` and `material-quantity` take-offs, serving the grading contractor and
materials yard (construction / surveying), and pairs with `soil-swell-shrink` to reconcile bank, loose, and stockpiled
volumes. Stays evidence-driven; a survey governs for payment.
