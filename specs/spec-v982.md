# roughlogic.com Specification v982 -- Luminaire Spacing-to-Mounting-Height Ratio (calc-elecdesign.js, Group A, 1 New Tile)

> **Status: LANDED (2026-07-18). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-elecdesign.js`** (Group
> A), no new module, group, or dependency. Inherits spec.md through spec-v981.md. Lighting-design sweep, beside the
> accepted `lumen-method` and `room-cavity-ratio` tiles.
>
> **The gap, and the evidence for it.** `lumen-method` says HOW MANY fixtures a room needs and `room-cavity-ratio`
> feeds its CU, but nothing tells the designer how far apart to PLACE the fixtures so the light stays even. Grep
> confirmed no spacing-criterion / S-MH tile. The number this settles: a troffer with a 1.3 spacing ratio hung 8 ft
> above the work plane may be spaced up to **10.4 ft** apart.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint (the `{ args: dimensionless }` shortcut, feet out of a ratio and feet), bounds-fuzzer,
worked-example registry, and reviewer-signoff apply. The v18/v21 contract: a non-finite input or a non-positive ratio,
mounting height, or spacing returns `{ error }`. Citation discipline (v19/v22): the IES luminaire spacing criterion (the
spacing-to-mounting-height ratio) by name, `GOVERNANCE.general`; the note stresses that the mounting height is measured
to the WORK plane (not floor-to-ceiling), that narrow-beam optics need a lower ratio (tighter spacing) and wide troffers
a higher one, that the perimeter row is set at about half the spacing off the wall, and that the fixture's actual
photometric distribution and the target uniformity govern the final layout.

## 2. The tile

### 2.1 `luminaire-spacing-mh-ratio` -- Luminaire Spacing-to-Mounting-Height Ratio

```
inputs:
  smh_ratio          spacing-to-mounting-height ratio, from the photometric report, default 1.3
  mounting_height_ft mounting height above the work plane (ft), default 8
  actual_spacing_ft  proposed center-to-center spacing (ft), default 9

max_spacing_ft = smh_ratio x mounting_height_ft
verdict: actual_spacing_ft <= max_spacing_ft -> uniform OK; else -> too wide (scalloping), tighten
```

**Pinned worked example.** SMH 1.3, 8 ft above the work plane: `max = 1.3 x 8 = ` **10.4 ft**; a proposed 9 ft layout
is at or below the max -> uniform OK. Cross-check: a narrow-beam fixture (SMH 1.0) at 12 ft has `max = 1.0 x 12 = `
**12.0 ft**, so a proposed 15 ft layout exceeds it -> scalloping / dark spots, tighten the rows.

## 3. Wiring

A `tools-data.js` row (group `A`, trades `["electrical"]`, beside `room-cavity-ratio`); a `tile-meta.js` `_TILES`
entry (`A`); a `citations.js` entry (IES spacing criterion / S-MH, `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the base example plus the narrow-beam cross-check, pinning max_spacing_ft);
`test/fixtures/compute-map.js` (`luminaire-spacing-mh-ratio` -> `computeLuminaireSpacingMh`, module
`../../calc-elecdesign.js`); `scripts/related-tiles.mjs` (-> `lumen-method` / `room-cavity-ratio` /
`luminaire-height-for-illuminance`); `data/search/aliases.json` (5 collision-checked aliases: "luminaire spacing",
"spacing to mounting height", "smh ratio", "spacing criterion", "light fixture spacing"), then
`node scripts/build-alias-shards.mjs`; the tile is rendered by the `_simpleRenderer` factory in the `ELECDESIGN_RENDERERS`
map, and the id added to the calc-elecdesign declare list in `app.js`; the `// dims:` annotation directly above the
compute; regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the max
spacing, the verdict bands and their exact edge, the linear-scaling directions, and the error seams. The
calc-elecdesign.js gzip cap and the Group A group shell are watched at build (cap raised for this tile). Home tile
count 1,430 -> 1,431.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(1.3 x 8 -> 10.4 ft).

## 5. Roadmap position

Lighting layout beside `lumen-method` and `room-cavity-ratio`, serving the electrical / lighting designer (electrical).
Deliberately the spacing screen; the fixture's photometric distribution, the room reflectances, and the target
uniformity ratio govern the final placement. Stays evidence-driven. Continues the lighting-design sweep at 1 new spec
(v982).
