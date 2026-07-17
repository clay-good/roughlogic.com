# roughlogic.com Specification v900 -- Gutter LF and Downspout Count Takeoff (calc-finish.js, Group E, 1 New Tile)

> **Status: LANDED (2026-07-17). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-finish.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v899.md. Roofing / exterior sweep, beside
> `gutter-downspout`.
>
> **The gap, and the evidence for it.** `gutter-downspout` sizes the cross-section for flow but nothing takes off the
> **gutter footage, downspout count, and hangers**. Grep confirmed no gutter-takeoff tile. The number this settles: 140 LF
> of eave on a 2,400 sf roof at 800 sf per downspout is **3 downspouts** and **30 LF** of downspout pipe, with about **70
> hangers** -- the material list behind the sizing.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
roofing siblings (`gutter-downspout`, `roofing-squares`): the eave length, wall height, hanger spacing, gutter length, and
downspout pipe carry `L`, the roof and per-downspout areas are `L^2`, and the downspout and hanger counts are
dimensionless. The v18/v21 contract: a non-finite or non-positive eave length, roof area, per-downspout area, wall
height, or hanger spacing returns `{ error }`. Citation discipline (v19/v22): the takeoff identity by name (gutter =
eave; downspouts = ceil(roof area / max area per downspout); pipe = downspouts x wall height; hangers = ceil(eave /
spacing)), `GOVERNANCE.general`; the note states that the maximum drainage area per downspout comes from the gutter and
downspout size and the rainfall (from `gutter-downspout` -- entered here), that the gutter runs the eave, that hangers go
about every 2 ft (tighter in snow country), and that this is distinct from the cross-section sizing in `gutter-downspout`.

## 2. The tile

### 2.1 `gutter-downspout-takeoff` -- Gutter LF and Downspout Count Takeoff

```
inputs:
  eave_length_ft             total eave / gutter length (ft)
  roof_area_sf               tributary roof area (ft^2)
  max_area_per_downspout_sf  max area per downspout (ft^2, default 800)
  wall_height_ft             downspout drop height (ft, default 10)
  hanger_spacing_ft          gutter hanger spacing (ft, default 2)

gutter_lf         = eave_length_ft
downspouts        = ceil(roof_area_sf / max_area_per_downspout_sf)
downspout_pipe_lf = downspouts * wall_height_ft
hangers           = ceil(eave_length_ft / hanger_spacing_ft)
```

**Pinned worked example.** Eave 140 ft, roof 2,400 sf, 800 sf/downspout, 10 ft wall, 2 ft hangers:
`gutter = ` **140 LF**; `downspouts = ceil(2400/800) = ` **3**; `pipe = 3*10 = ` **30 LF**; `hangers = ceil(140/2) = `
**70**. Cross-check: a bigger 4,000 sf roof needs `ceil(4000/800) = ` **5 downspouts** and **50 LF** of pipe -- the roof
area drives the downspouts, the eave drives the gutter and hangers.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["roofing", "carpentry"]`, inside the `// Group E` finish block beside
`gutter-downspout`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (downspouts = ceil(roof area / max area per downspout), `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the larger-roof cross-check); `test/fixtures/compute-map.js`
(`gutter-downspout-takeoff` -> `computeGutterDownspoutTakeoff`, module `../../calc-finish.js`);
`scripts/related-tiles.mjs` (-> `gutter-downspout` / `roofing-squares` / `rain-load-ponding`);
`data/search/aliases.json` (5 collision-checked aliases: "gutter takeoff", "downspout count", "gutter linear feet",
"gutter hanger count", "downspout pipe footage"); a hand-written renderer in the `FINISH_RENDERERS` map mirroring the
`gutter-downspout` renderer (non-exported, so no DOM-sentinel dims row), and the id added to the calc-finish declare list
in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus + tile-index + citation-strings;
a `bounds-fuzzer.test.js` block pinning the gutter footage, downspout count, pipe footage, hanger count, and the error
seams (non-positive eave, roof area, per-downspout area, wall height, hanger spacing). The calc-finish.js gzip cap is
watched at build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from
home first paint. Home tile count 1,348 -> 1,349.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(ceil(2400/800) -> 3 downspouts, 30 LF pipe).

## 5. Roadmap position

Roofing takeoff beside the `gutter-downspout` sizing tile, serving the gutter installer (roofing / carpentry). Stays
evidence-driven; the downspout size and rainfall set the drainage area.
