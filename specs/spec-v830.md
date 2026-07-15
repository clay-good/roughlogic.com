# roughlogic.com Specification v830 -- Stabilized Construction Entrance Stone (calc-earthwork.js, Group E, 1 New Tile)

> **Status: PROPOSED (2026-07-15). Single-tile spec.**
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v829.md. Erosion-control sweep (entry 9), the
> track-out BMP.
>
> **The gap, and the evidence for it.** Nothing takes off a **stabilized construction entrance** -- the pad of coarse
> stone at a site exit that knocks mud off tires so the crew does not track sediment onto the public road. Grep confirmed
> no construction-entrance tile. The number this settles: the common 50 ft x 14 ft x 6 in pad is **13 cy** of stone,
> about **17.5 tons** -- the load that has to be on site before the first truck rolls out, and the AHJ writes it into the
> permit.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`aggregate`, `riprap-tonnage`): the length and width carry `L`, the depth `L`, the unit weight
`M L^-3`, the volume `L^3`, and the tonnage `M`. The v18/v21 contract: a non-finite or non-positive length, width, depth,
or unit weight returns `{ error }`. Citation discipline (v19/v22): the pad take-off identity by name (tons = length x
width x depth x unit weight / 2000), `GOVERNANCE.general`; the note states that the general permit or AHJ sets the pad
dimensions (commonly at least 50 ft long, the full width of the exit, and 6 in of 1-4 in clean stone over a geotextile
separator), that the geotextile under the pad is taken off separately, and that the pad is topped up as it works into the
subgrade.

## 2. The tile

### 2.1 `rock-construction-entrance` -- Stabilized Construction Entrance Stone

```
inputs:
  length_ft    entrance length (ft, default 50)
  width_ft     entrance width (ft, default 14)
  depth_in     stone depth (in, default 6)
  unit_wt_pcf  placed stone unit weight (pcf, default 100)

volume_cy = length_ft * width_ft * (depth_in/12) / 27
tons      = length_ft * width_ft * (depth_in/12) * unit_wt_pcf / 2000
```

**Pinned worked example.** Length 50 ft, width 14 ft, depth 6 in, unit weight 100 pcf:
`volume = 50*14*0.5 / 27 = ` **13.0 cy**; `tons = 50*14*0.5*100 / 2000 = ` **17.5 tons**. Cross-check: a longer 70 ft
entrance for a deep site raises it to `70*14*0.5*100/2000 = ` **24.5 tons** -- length is the lever the permit usually
fixes at a minimum.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block near
`riprap-tonnage`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (tons = L x W x depth x unit weight / 2000, `GOVERNANCE.general`); `test/fixtures/worked-examples.json`
(the pinned example plus the longer-entrance cross-check); `test/fixtures/compute-map.js` (`rock-construction-entrance` ->
`computeRockConstructionEntrance`, module `../../calc-earthwork.js`); `scripts/related-tiles.mjs` (-> `geotextile-takeoff`
/ `aggregate` / `riprap-tonnage`); `data/search/aliases.json` (5 collision-checked aliases: "construction entrance stone",
"stabilized entrance tonnage", "rock entrance pad", "track-out pad stone", "site entrance aggregate"); a hand-written
renderer in the `EARTHWORK_RENDERERS` map mirroring the `aggregate` renderer (non-exported, so no DOM-sentinel dims row),
and the id added to the calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute;
regenerated v14 corpus + tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the volume and tonnage and
the error seams (non-positive length, width, depth, unit weight). The calc-earthwork.js gzip cap is watched at build.
Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first paint.
Home tile count 1,278 -> 1,279.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(50*14*0.5*100/2000 -> 17.5 tons).

## 5. Roadmap position

Ninth erosion-control tile, closing the SWPPP BMP set (perimeter, channel, storage, cover, track-out) beside the coming
`geotextile-takeoff` for the separator under the pad. Serves the site crew (construction / surveying). Stays
evidence-driven; the permit sets the pad size.
