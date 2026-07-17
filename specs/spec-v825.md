# roughlogic.com Specification v825 -- Silt Fence Drainage-Area and Length Check (calc-earthwork.js, Group E, 1 New Tile)

> **Status: LANDED 2026-07-16 (package 0.398.0).** Executed against the live catalog (1,273 -> 1,274 tiles). Related
> tiles retargeted to existing tiles (rusle-soil-loss, riprap-d50, spoil-setback; the proposed check-dam-spacing and
> sediment-basin-volume siblings are not yet landed). Single-tile spec.
> In-scope catalog expansion under the spec-v106 trades-only charter. Adds one tile to **`calc-earthwork.js`** (Group E),
> no new module, group, or dependency. Inherits spec.md through spec-v824.md. Erosion-control sweep (entry 4), beside
> `rusle-soil-loss`.
>
> **The gap, and the evidence for it.** Nothing checks a **silt fence** -- whether its length matches the drainage area it
> protects and whether the slope length behind it stays under the AHJ limit. Grep confirmed no silt-fence tile. The widely
> published guideline of a quarter acre of drainage per 100 ft of fence is a generic rule (no copyrighted table
> reproduced), and the slope-length limit is user-entered from the SWPPP spec. The number this settles: a 0.5-acre
> tributary needs at least **200 ft** of fence, so a 250 ft run is adequate and can take up to **0.625 acre** -- but a
> full acre would need 400 ft, and that short fence is why a fence overtops and blows out.

Repository: github.com/clay-good/roughlogic.com -- US standards only.

## 1. Inheritance and conventions

The v14 dimensional lint, bounds-fuzzer, worked-example registry, and reviewer-signoff apply, mirroring the Group E
earthwork siblings (`rusle-soil-loss`, `spoil-setback`): the tributary area and max area carry `L^2` (acres), the fence
length and slope lengths `L`, and the two adequacy flags are dimensionless booleans. The v18/v21 contract: a non-finite or
non-positive tributary area, fence length, slope length, or max slope length returns `{ error }`. Citation discipline
(v19/v22): the drainage-area guideline by name (one quarter acre of drainage per 100 ft of fence, i.e. required length =
tributary acres x 400), `GOVERNANCE.general`; the note states that the quarter-acre-per-100-ft figure is a generic
published guideline, that the SWPPP designer and the permitting AHJ set the actual maximum slope length and fence spacing
(entered here, not reproduced from a copyrighted table), and that silt fence is for sheet flow only -- never across a
channel or in concentrated flow, where a rock check dam belongs.

## 2. The tile

### 2.1 `silt-fence-drainage` -- Silt Fence Drainage-Area and Length Check

```
inputs:
  tributary_area_ac    drainage area behind the fence (acres)
  fence_length_ft      silt fence length provided (ft)
  slope_length_ft      slope length behind the fence (ft)
  max_slope_length_ft  AHJ maximum slope length (ft, default 100)

required_fence_len_ft = tributary_area_ac * 400
max_area_ac           = fence_length_ft / 400
length_adequate       = fence_length_ft >= required_fence_len_ft
slope_ok              = slope_length_ft <= max_slope_length_ft
```

**Pinned worked example.** Tributary 0.5 acre, fence 250 ft, slope 60 ft, AHJ max 100 ft:
`required = 0.5 * 400 = ` **200 ft** (250 >= 200, adequate); `max area = 250 / 400 = ` **0.625 acre**;
slope 60 <= 100, ok. Cross-check: a 1.0-acre tributary needs `1.0 * 400 = ` **400 ft**, so the same 250 ft fence is short
and `length_adequate` flips to false -- the fence has to grow with the area it catches.

## 3. Wiring

A `tools-data.js` row (group `E`, trades `["construction", "surveying"]`, inside the `// Group E` earthwork block near
`rusle-soil-loss`) -- the Group E citations-audit count moves up by one; a `tile-meta.js` `_TILES` entry (`E`); a
`citations.js` entry (required length = tributary acres x 400 [quarter acre per 100 ft], `GOVERNANCE.general`);
`test/fixtures/worked-examples.json` (the pinned example plus the full-acre short-fence cross-check);
`test/fixtures/compute-map.js` (`silt-fence-drainage` -> `computeSiltFenceDrainage`, module `../../calc-earthwork.js`);
`scripts/related-tiles.mjs` (-> `rusle-soil-loss` / `check-dam-spacing` / `sediment-basin-volume`);
`data/search/aliases.json` (5 collision-checked aliases: "silt fence length", "silt fence drainage area", "silt fence
check", "sediment fence sizing", "perimeter control fence"); a hand-written renderer in the `EARTHWORK_RENDERERS` map
mirroring `_v67renderHaulCycleProduction` (non-exported, so no DOM-sentinel dims row), and the id added to the
calc-earthwork declare list in `app.js`; the `// dims:` annotation directly above the compute; regenerated v14 corpus +
tile-index + citation-strings; a `bounds-fuzzer.test.js` block pinning the required length, the max area, both flags, and
the error seams (non-positive area, fence length, slope length, max slope). The calc-earthwork.js gzip cap is watched at
build. Verify at build, including `check-shells` and `check-module-sizes` post-build. Lazy-loaded, absent from home first
paint. Home tile count 1,273 -> 1,274.

## 4. As-landed verification (gate plan)

Standard green bar: `npm run lint`; `npm test` (+2 fixtures, the new fuzzer block, the Group E audit bump); `npm run build`;
`node scripts/check-shells.mjs` and `check-shell-mobile.mjs`; `node scripts/check-module-sizes.mjs` post-build;
`npm run data:verify`; worked-examples runner; 320 px audit; render + output read to the value
(0.5 * 400 -> 200 ft required, 250 adequate).

## 5. Roadmap position

Fourth erosion-control tile: the perimeter-control check between `rusle-soil-loss` and the storage BMPs
(`sediment-basin-volume`, `check-dam-spacing`), serving the erosion-control crew (construction / surveying). Stays
evidence-driven; the AHJ sets the slope-length limit.
